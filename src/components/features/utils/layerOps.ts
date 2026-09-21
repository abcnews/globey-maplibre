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

/** Sanitises free text to the layer id alphabet (`[a-z0-9]`). */
export function toLayerIdSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Generates an ACTO-safe default id for a new layer, e.g. `areas8x2b1`, `icon4k7e0`.
 * Pass `takenIds` to guarantee it doesn't collide with an existing layer.
 */
export function newLayerId(kind: GlobeLayer['type'], takenIds: Iterable<string> = []): string {
  const prefix = toLayerIdSlug(kind.replace(/^geojson/, ''));
  const taken = new Set(takenIds);
  const candidate = () => `${prefix}${randomId().slice(0, 5)}`;
  let id = candidate();
  while (taken.has(id)) id = candidate();
  return id;
}

/**
 * Returns `base` slugged, or with a numeric suffix if already taken (`georgia`, `georgia2`).
 * Falls back to `newLayerId(kind)` when the slug is empty.
 */
export function uniqueLayerId(base: string, kind: GlobeLayer['type'], takenIds: Iterable<string>): string {
  const taken = new Set(takenIds);
  const slug = toLayerIdSlug(base);
  if (!slug) return newLayerId(kind, taken);
  if (!taken.has(slug)) return slug;
  let suffix = 2;
  while (taken.has(`${slug}${suffix}`)) suffix++;
  return `${slug}${suffix}`;
}

/** Whether `id` is free to use, ignoring the layer currently being edited (`currentLayerId`). */
export function isLayerIdUnique(layers: GlobeLayer[], id: string, currentLayerId?: string): boolean {
  return !layers.some(layer => layer.id === id && layer.id !== currentLayerId);
}

export function findLayerIndex(options: GlobeJsonBlob, id: string): number {
  return options.layers.findIndex(layer => layer.id === id);
}

export function findLayer(options: GlobeJsonBlob, id: string): GlobeLayer | undefined {
  return options.layers.find(layer => layer.id === id);
}

/**
 * Appends a layer to the top of the stack. Re-rolls the layer's id in place if it's already
 * taken, since the schema rejects duplicate ids (mutating `layer` keeps any caller-held
 * reference, e.g. the Builder's `editingItem`, pointing at the right id).
 */
export function addLayer(options: GlobeJsonBlob, layer: GlobeLayer): void {
  const takenIds = options.layers.map(({ id }) => id);
  if (takenIds.includes(layer.id)) layer.id = newLayerId(layer.type, takenIds);
  options.layers = [...options.layers, layer];
}

/** Replaces a layer in place, preserving its stack position. `data.id` may differ from `id` (a rename). */
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
 * Builds the Builder's list row for a layer, titled by its `id` — never a name recomputed
 * from other fields.
 */
export function describeLayer<T extends GlobeLayer>(
  feature: LayerFeatureDefinition<T>,
  layer: T,
  index: number
): LayerItemDescriptor<T> {
  return {
    id: layer.id,
    kind: layer.type,
    name: layer.id || feature.label,
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
