export * from './types.ts';
export * from './utils/layerOps.ts';
export * from './utils/buttonHelpers.ts';
export * from './layers/layerManager.ts';
export * from './layers/layerUtils.ts';

import type { LayerAddMenuItem, LayerFeatureDefinition } from './types.ts';

import { geoJsonAreasFeature } from './GeoJsonAreas/index.ts';
import { geoJsonLinesFeature } from './GeoJsonLines/index.ts';
import { geoJsonPointsFeature } from './GeoJsonPoints/index.ts';
import { highlightFeaturesMenuItem } from './HighlightFeatures/index.ts';
import { iconFeature } from './Icon/index.ts';
import { imageSourceFeature } from './ImageSource/index.ts';
import { griddedFeature } from './Gridded/index.ts';
import { mapLabelsFeature } from './MapLabels/index.ts';
import { customLabelsFeature } from './CustomLabels/index.ts';
import { streetMapFeature } from './MapVector/index.ts';
import { rasterFeature } from './MapRaster/index.ts';

export const layerFeatureRegistry: LayerFeatureDefinition<any>[] = [
  geoJsonAreasFeature,
  geoJsonLinesFeature,
  geoJsonPointsFeature,
  iconFeature,
  imageSourceFeature,
  griddedFeature,
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
 * generates (Areas) layers rather than adding a blank one. Whether an entry is currently selectable
 * is `canAddFeature()`'s call, not a per-entry `canAdd`.
 */
export const layerAddMenuRegistry: LayerAddMenuItem[] = layerFeatureRegistry.flatMap(feature =>
  feature === geoJsonPointsFeature ? [menuItemFor(feature), highlightFeaturesMenuItem] : [menuItemFor(feature)]
);
