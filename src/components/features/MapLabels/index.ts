import type { LayerFeatureDefinition } from '../types.ts';
import type { MapLabelsLayer } from '../../../lib/data/jsonBlob.ts';
import { DEFAULT_MAP_LABELS } from '../../../lib/data/layerHelpers.ts';
import { newLayerId } from '../layerOps.ts';
import { Tag as LabelIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderMapLabelsConfigModal from './BuilderMapLabelsConfigModal.svelte';

export const mapLabelsFeature: LayerFeatureDefinition<MapLabelsLayer> = {
  kind: 'mapLabels',
  label: 'Map Labels',
  icon: LabelIcon,
  isMultiItem: false,

  buttons: [
    createEditButton<MapLabelsLayer>({ title: 'Edit map labels' }),
    createDeleteButton<MapLabelsLayer>({ title: 'Hide map labels' })
  ],

  // A newly added map-labels layer turns everything on — the user added it to see labels.
  // `DEFAULT_MAP_LABELS` is the narrower set the renderer falls back to.
  createDefault() {
    return {
      id: newLayerId('mapLabels'),
      type: 'mapLabels',
      enabled: true,
      ...DEFAULT_MAP_LABELS,
      continents: true,
      states: true,
      cities: true,
      towns: true,
      oceans: true
    };
  },

  ConfigModal: BuilderMapLabelsConfigModal
};
