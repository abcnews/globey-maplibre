import { HexagonFill } from 'svelte-bootstrap-icons';
import type { LayerFeatureDefinition } from '../types.ts';
import type { GeoJsonAreasLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { geoJsonLayerButtons, hasValidGeoJsonSource } from '../utils/geojson/feature.ts';
import BuilderGeoJsonAreasModal from './BuilderGeoJsonAreasModal.svelte';
import GeoJsonAreasHandler from './GeoJsonAreasHandler.svelte';

export const geoJsonAreasFeature: LayerFeatureDefinition<GeoJsonAreasLayer> = {
  kind: 'geojsonAreas',
  label: 'GeoJSON Areas',
  icon: HexagonFill,
  isMultiItem: true,
  buttons: geoJsonLayerButtons<GeoJsonAreasLayer>('GeoJSON areas'),

  createDefault() {
    return {
      id: newLayerId('geojsonAreas'),
      type: 'geojsonAreas',
      colourMode: 'simple',
      isOpaque: false
    };
  },

  isValid: hasValidGeoJsonSource,
  ConfigModal: BuilderGeoJsonAreasModal,
  MapRenderer: GeoJsonAreasHandler
};
