export * from './types.ts';
export * from './layerOps.ts';
export * from './buttonHelpers.ts';
export * from './layers/layerManager.ts';
export * from './layers/layerUtils.ts';

import type { LayerAddMenuItem, LayerFeatureDefinition } from './types.ts';

import { geoJsonFeature } from './GeoJson/index.ts';
import { highlightFeaturesMenuItem } from './HighlightFeatures/index.ts';
import { iconFeature } from './Icon/index.ts';
import { imageSourceFeature } from './ImageSource/index.ts';
import { mapLabelsFeature } from './MapLabels/index.ts';
import { customLabelsFeature } from './CustomLabels/index.ts';
import { streetMapFeature } from './MapVector/index.ts';
import { rasterFeature } from './MapRaster/index.ts';

export const layerFeatureRegistry: LayerFeatureDefinition<any>[] = [
  geoJsonFeature,
  iconFeature,
  imageSourceFeature,
  mapLabelsFeature,
  customLabelsFeature,
  streetMapFeature,
  rasterFeature
];

/** Looks up the feature that owns a blob layer's `type`. */
export function featureForKind(kind: string): LayerFeatureDefinition<any> | undefined {
  return layerFeatureRegistry.find(feature => feature.kind === kind);
}

const menuItemFor = (feature: LayerFeatureDefinition<any>): LayerAddMenuItem => ({
  id: feature.kind,
  label: feature.label,
  icon: feature.icon,
  feature
});

/**
 * The Add Layer menu is the feature registry, in registry order, plus the one entry that
 * generates layers rather than adding a blank one. Whether an entry is currently selectable
 * is `canAddFeature()`'s call, not a per-entry `canAdd`.
 */
export const layerAddMenuRegistry: LayerAddMenuItem[] = layerFeatureRegistry.flatMap(feature =>
  feature === geoJsonFeature ? [menuItemFor(feature), highlightFeaturesMenuItem] : [menuItemFor(feature)]
);
