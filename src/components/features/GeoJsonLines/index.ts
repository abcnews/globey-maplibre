import { Bezier2 } from 'svelte-bootstrap-icons';
import type { LayerFeatureDefinition } from '../types.ts';
import type { GeoJsonLinesLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { geoJsonLayerButtons, hasValidGeoJsonSource } from '../utils/geojson/feature.ts';
import BuilderGeoJsonLinesModal from './BuilderGeoJsonLinesModal.svelte';
import GeoJsonLinesHandler from './GeoJsonLinesHandler.svelte';

export const geoJsonLinesFeature: LayerFeatureDefinition<GeoJsonLinesLayer> = {
  kind: 'geojsonLines',
  label: 'GeoJSON Lines',
  icon: Bezier2,
  isMultiItem: true,
  buttons: geoJsonLayerButtons<GeoJsonLinesLayer>('GeoJSON lines'),

  createDefault() {
    return {
      id: newLayerId('geojsonLines'),
      type: 'geojsonLines',
      colourMode: 'simple',
      lineAnimationStyle: 'fade'
    };
  },

  isValid: hasValidGeoJsonSource,
  ConfigModal: BuilderGeoJsonLinesModal,
  MapRenderer: GeoJsonLinesHandler
};
