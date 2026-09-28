import { describe, it, expect } from 'vitest';
import {
  addLayer,
  updateLayer,
  deleteLayer,
  moveLayerTo,
  findLayer,
  findLayerIndex,
  describeLayer,
  canAddFeature,
  newLayerId,
  uniqueLayerId,
  isLayerIdUnique
} from './layerOps.ts';
import { layerFeatureRegistry, featureForKind } from '../index.ts';
import { parseGlobeJsonBlob, type GlobeJsonBlob, type GlobeLayer } from '../../../lib/data/jsonBlob.ts';

const layer = (id: string, type: GlobeLayer['type'], extra: Record<string, unknown> = {}) =>
  ({ id, type, ...extra }) as GlobeLayer;

const blobWith = (layers: GlobeLayer[]): GlobeJsonBlob => parseGlobeJsonBlob({ layers });
const ids = (blob: GlobeJsonBlob) => blob.layers.map(l => l.id);

describe('layerOps', () => {
  it('appends new layers to the top of the stack', () => {
    const blob = blobWith([layer('a', 'geojsonAreas')]);
    addLayer(blob, layer('b', 'icon', { cmid: 1, coords: [0, 0] }));
    expect(ids(blob)).toEqual(['a', 'b']);
  });

  it('replaces (and can rename) a layer in place, preserving its stack position', () => {
    const blob = blobWith([layer('a', 'geojsonAreas'), layer('b', 'geojsonAreas'), layer('c', 'geojsonAreas')]);
    updateLayer(blob, 'b', layer('renamed', 'geojsonAreas'));
    expect(ids(blob)).toEqual(['a', 'renamed', 'c']);
    expect(findLayer(blob, 'b')).toBeUndefined();
  });

  it('ignores an update or move for an id that is not in the blob', () => {
    const blob = blobWith([layer('a', 'geojsonAreas')]);
    updateLayer(blob, 'missing', layer('missing', 'geojsonAreas'));
    moveLayerTo(blob, 'missing', 0);
    expect(ids(blob)).toEqual(['a']);
  });

  it('deletes by id and reports positions', () => {
    const blob = blobWith([layer('a', 'geojsonAreas'), layer('b', 'geojsonAreas')]);
    expect(findLayerIndex(blob, 'b')).toBe(1);
    deleteLayer(blob, 'a');
    expect(ids(blob)).toEqual(['b']);
    expect(findLayerIndex(blob, 'a')).toBe(-1);
  });

  it('reorders to an absolute position', () => {
    const blob = blobWith([layer('a', 'geojsonAreas'), layer('b', 'geojsonAreas'), layer('c', 'geojsonAreas')]);
    moveLayerTo(blob, 'c', 0);
    expect(ids(blob)).toEqual(['c', 'a', 'b']);
  });

  it('generates distinct ids', () => {
    expect(newLayerId('geojsonAreas')).not.toBe(newLayerId('geojsonAreas'));
    expect(newLayerId('geojsonAreas')).toMatch(/^areas[a-z0-9]+$/);
  });

  it('re-rolls a colliding id on add', () => {
    const blob = blobWith([layer('a', 'geojsonAreas')]);
    addLayer(blob, layer('a', 'geojsonAreas'));
    expect(new Set(ids(blob)).size).toBe(2);
  });

  it('builds unique ids from free text', () => {
    expect(uniqueLayerId('New Zealand', 'geojsonAreas', [])).toBe('newzealand');
    expect(uniqueLayerId('Georgia', 'geojsonAreas', ['georgia', 'georgia2'])).toBe('georgia3');
    expect(uniqueLayerId('!!', 'geojsonAreas', [])).toMatch(/^areas[a-z0-9]+$/);
  });

  it('checks id uniqueness, ignoring the layer being edited', () => {
    const layers = [layer('a', 'geojsonAreas'), layer('b', 'geojsonAreas')];
    expect(isLayerIdUnique(layers, 'a', 'a')).toBe(true);
    expect(isLayerIdUnique(layers, 'a', 'b')).toBe(false);
    expect(isLayerIdUnique(layers, 'c')).toBe(true);
  });
});

describe('describeLayer', () => {
  const feature = featureForKind('raster')!;

  it('titles the row by the layer id', () => {
    const item = describeLayer(feature, layer('r1', 'raster') as any, 2);
    expect(item.name).toBe('r1');
    expect(item.index).toBe(2);
    expect(item.id).toBe('r1');
    expect(item.kind).toBe('raster');
  });

});

describe('canAddFeature', () => {
  const singleton = featureForKind('mapLabels')!;
  const multi = featureForKind('geojsonAreas')!;

  it('allows a singleton kind only while it is absent', () => {
    const empty = blobWith([]);
    expect(canAddFeature(singleton, empty)).toBe(true);
    expect(canAddFeature(singleton, blobWith([layer('m', 'mapLabels')]))).toBe(false);
  });

  it('always allows a multi-item kind', () => {
    expect(canAddFeature(multi, blobWith([layer('g', 'geojsonAreas')]))).toBe(true);
  });
});

describe('feature registry', () => {
  it('creates a valid, addable default layer for every kind', () => {
    layerFeatureRegistry.forEach(feature => {
      const created = feature.createDefault({});
      expect(created.type, `${feature.kind} createDefault must stamp its own type`).toBe(feature.kind);
      expect(created.id, `${feature.kind} createDefault must stamp an id`).toBeTruthy();

      // Round-trips through the schema — createDefault must supply every non-optional field.
      const blob = blobWith([]);
      addLayer(blob, created);
      expect(() => parseGlobeJsonBlob(JSON.parse(JSON.stringify(blob)))).not.toThrow();
    });
  });

  it('has exactly one feature per layer kind', () => {
    const kinds = layerFeatureRegistry.map(f => f.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});
