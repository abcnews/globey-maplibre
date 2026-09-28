import { CircleFill } from 'svelte-bootstrap-icons';
import type { LayerFeatureDefinition } from '../types.ts';
import type { GeoJsonPointsLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { geoJsonLayerButtons, hasValidGeoJsonSource } from '../utils/geojson/feature.ts';
import BuilderGeoJsonPointsModal from './BuilderGeoJsonPointsModal.svelte';
import GeoJsonPointsHandler from './GeoJsonPointsHandler.svelte';

export const geoJsonPointsFeature: LayerFeatureDefinition<GeoJsonPointsLayer> = {
  kind: 'geojsonPoints',
  label: 'GeoJSON Points',
  icon: CircleFill,
  isMultiItem: true,
  buttons: geoJsonLayerButtons<GeoJsonPointsLayer>('GeoJSON points'),

  createDefault() {
    return {
      id: newLayerId('geojsonPoints'),
      type: 'geojsonPoints',
      colourMode: 'simple',
      isOpaque: false
    };
  },

  isValid: hasValidGeoJsonSource,
  ConfigModal: BuilderGeoJsonPointsModal,
  LayerRenderer: GeoJsonPointsHandler
};
