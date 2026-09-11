export * from './types.ts';
export * from './buttonHelpers.ts';
export * from './layers/layerManager.ts';
export * from './layers/layerUtils.ts';

import type { LayerFeatureDefinition } from './types.ts';

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

export const layerAddMenuRegistry = [
  {
    id: geoJsonFeature.kind,
    label: geoJsonFeature.label,
    icon: geoJsonFeature.icon,
    feature: geoJsonFeature,
    canAdd: geoJsonFeature.canAdd
  },
  highlightFeaturesMenuItem,
  {
    id: iconFeature.kind,
    label: iconFeature.label,
    icon: iconFeature.icon,
    feature: iconFeature,
    canAdd: iconFeature.canAdd
  },
  {
    id: imageSourceFeature.kind,
    label: imageSourceFeature.label,
    icon: imageSourceFeature.icon,
    feature: imageSourceFeature,
    canAdd: imageSourceFeature.canAdd
  },
  {
    id: mapLabelsFeature.kind,
    label: mapLabelsFeature.label,
    icon: mapLabelsFeature.icon,
    feature: mapLabelsFeature,
    canAdd: mapLabelsFeature.canAdd
  },
  {
    id: customLabelsFeature.kind,
    label: customLabelsFeature.label,
    icon: customLabelsFeature.icon,
    feature: customLabelsFeature,
    canAdd: customLabelsFeature.canAdd
  },
  {
    id: streetMapFeature.kind,
    label: streetMapFeature.label,
    icon: streetMapFeature.icon,
    feature: streetMapFeature,
    canAdd: streetMapFeature.canAdd
  },
  {
    id: rasterFeature.kind,
    label: rasterFeature.label,
    icon: rasterFeature.icon,
    feature: rasterFeature,
    canAdd: rasterFeature.canAdd
  }
];

export * from './GeoJson/index.ts';
export * from './HighlightFeatures/index.ts';
export * from './Icon/index.ts';
export * from './ImageSource/index.ts';
export * from './MapLabels/index.ts';
export * from './CustomLabels/index.ts';
export * from './PanZoom/index.ts';
export * from './MapRaster/index.ts';
export * from './MapVector/index.ts';
export * from './Minimap/index.ts';
export * from './Attribution/index.ts';
export * from './Projection/index.ts';

