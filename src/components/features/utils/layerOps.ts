import type { GlobeJsonBlob, GlobeLayer } from '../../../lib/data/jsonBlob.ts';
import { moveLayer } from '../../../lib/data/stack.ts';
import { randomId } from '../../../lib/randomId.ts';
import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';

/**
 * Generic add/update/delete/reorder over `GlobeJsonBlob.layers`.
 *
 * Every layer kind shares one array, so none of this is kind-specific — which is why
 * `LayerFeatureDefinition` no longer carries its own `add`/`delete`/`update`/`setZIndex`.
 * All of these mutate the blob draft in place, matching `mutateBlob`'s clone→mutate→commit
 * contract in `Builder.layers.svelte`.
 */

/** Generates an id for a new layer: stable once assigned, and unique within a blob. */
export function newLayerId(kind: GlobeLayer['type']): string {
  return `${kind.toLowerCase()}-${randomId()}`;
}

export function findLayerIndex(options: GlobeJsonBlob, id: string): number {
  return options.layers.findIndex(layer => layer.id === id);
}

export function findLayer(options: GlobeJsonBlob, id: string): GlobeLayer | undefined {
  return options.layers.find(layer => layer.id === id);
}

/** Appends a layer to the top of the stack. */
export function addLayer(options: GlobeJsonBlob, layer: GlobeLayer): void {
  options.layers = [...options.layers, layer];
}

/** Replaces a layer in place, preserving its stack position. */
export function updateLayer(options: GlobeJsonBlob, id: string, data: GlobeLayer): void {
  const index = findLayerIndex(options, id);
  if (index === -1) return;
  options.layers = options.layers.map((layer, i) => (i === index ? data : layer));
}

export function deleteLayer(options: GlobeJsonBlob, id: string): void {
  options.layers = options.layers.filter(layer => layer.id !== id);
}

/** Reorders a layer to an absolute position in the stack (0 = bottom). */
export function moveLayerTo(options: GlobeJsonBlob, id: string, toIndex: number): void {
  const fromIndex = findLayerIndex(options, id);
  if (fromIndex === -1) return;
  options.layers = moveLayer(options.layers, fromIndex, toIndex);
}

/**
 * Builds the Builder's list row for a layer. Prefers the layer's own explicit `name`,
 * falling back to the feature's label — never a name recomputed from other fields.
 */
export function describeLayer<T extends GlobeLayer>(
  feature: LayerFeatureDefinition<T>,
  layer: T,
  index: number
): LayerItemDescriptor<T> {
  return {
    id: layer.id,
    kind: layer.type,
    name: layer.name || feature.label,
    index,
    data: layer
  };
}

/**
 * Whether another layer of this kind may be added: singleton kinds only while absent,
 * plus any extra check the feature declares.
 */
export function canAddFeature(feature: LayerFeatureDefinition<any>, options: GlobeJsonBlob): boolean {
  if (!feature.isMultiItem && options.layers.some(layer => layer.type === feature.kind)) return false;
  return feature.canAdd?.(options) ?? true;
}
