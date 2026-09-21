import type { GlobeJsonBlob, GlobeLayer } from './jsonBlob.ts';
import { Z_INDEX_BASE_RASTER } from '../zIndex.ts';

/**
 * A blob layer annotated with the render z-index derived from its position in
 * `GlobeJsonBlob.layers`. Nothing persists a z-index — it exists only between
 * `stackLayers()` and the MapLibre handlers.
 */
export type Stacked<T extends GlobeLayer = GlobeLayer> = T & { zIndex: number };

/** A layer of one specific kind, annotated with its derived z-index. */
export type StackedOfKind<K extends GlobeLayer['type']> = Stacked<Extract<GlobeLayer, { type: K }>>;

/**
 * Spacing between adjacent layers' derived z-indices. Comfortably larger than
 * `SUB_LAYER_OUTLINE_OFFSET` (0.001) and `Z_INDEX_STACK_STEP` (0.0001), so a
 * layer's own internal sub-layers can never bleed past its neighbours.
 */
export const STACK_SPACING = 1;

/**
 * Array order is the single source of truth for stacking: index 0 is the bottom
 * of the stack. The base offset keeps every user layer above the background
 * canvas, matching the tier constants the MapLibre handlers were written against.
 */
export function stackLayers(blob: GlobeJsonBlob): Stacked[] {
  return (blob.layers ?? []).map((layer, index) => ({
    ...layer,
    zIndex: Z_INDEX_BASE_RASTER + index * STACK_SPACING
  }));
}

/** Every layer of one kind, in stack order (bottom first). */
export function layersOfKind<K extends GlobeLayer['type']>(stacked: Stacked[], kind: K): StackedOfKind<K>[] {
  return stacked.filter((layer): layer is StackedOfKind<K> => layer.type === kind);
}

/**
 * The single layer of a kind the Builder only ever adds once (`mapLabels`,
 * `streetMap`, `customLabels`). Returns the lowest one if a hand-edited blob
 * somehow contains several.
 */
export function singletonOfKind<K extends GlobeLayer['type']>(
  stacked: Stacked[],
  kind: K
): StackedOfKind<K> | undefined {
  return layersOfKind(stacked, kind)[0];
}

/**
 * Immutable reorder backing the Builder's move up/down controls. Out-of-range
 * indices clamp rather than throw, so a click on the top item's "up" is a no-op.
 */
export function moveLayer(layers: GlobeLayer[], fromIndex: number, toIndex: number): GlobeLayer[] {
  if (fromIndex < 0 || fromIndex >= layers.length) return layers;

  const clampedTo = Math.max(0, Math.min(layers.length - 1, toIndex));
  if (clampedTo === fromIndex) return layers;

  const next = [...layers];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}
