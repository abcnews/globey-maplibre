import { Grid3x3Gap } from 'svelte-bootstrap-icons';
import type { LayerFeatureDefinition } from '../types.ts';
import type { GriddedLayer } from '../../../lib/data/jsonBlob.ts';
import { griddedLayerSchema } from '../../../lib/data/jsonBlob.ts';
import { isValidUrl } from '../../../lib/data/layerHelpers.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { createDeleteButton, createEditButton, createGoToButton } from '../utils/buttonHelpers.ts';
import { loadGrid } from './data/loadGrid.ts';
import BuilderGriddedConfigModal from './BuilderGriddedConfigModal.svelte';
import GriddedHandler from './GriddedHandler.svelte';

export const griddedFeature: LayerFeatureDefinition<GriddedLayer> = {
  kind: 'gridded',
  label: 'Gridded Data',
  icon: Grid3x3Gap,
  isMultiItem: true,

  // A factory: go-to only appears once there's a URL. Bounds come from the file itself, which
  // `loadGrid` has usually already downloaded and cached for the map.
  buttons: item => [
    ...(item.data?.url
      ? [
          createGoToButton<GriddedLayer>({
            title: 'Go to gridded data layer',
            getTarget: async ({ data }) => {
              const grid = await loadGrid(data).catch(err => console.error('[griddedFeature] Go-to failed:', err));
              if (!grid) return undefined;
              const [west, south, east, north] = grid.bounds;
              return {
                type: 'bounds',
                bounds: [
                  [west, north],
                  [east, south]
                ]
              };
            }
          })
        ]
      : []),
    createEditButton<GriddedLayer>({ title: 'Edit gridded data layer' }),
    createDeleteButton<GriddedLayer>({ title: 'Delete gridded data layer' })
  ],

  createDefault() {
    return griddedLayerSchema.parse({ id: newLayerId('gridded'), type: 'gridded' });
  },

  isValid(data: GriddedLayer) {
    return isValidUrl(data?.url);
  },

  ConfigModal: BuilderGriddedConfigModal,
  LayerRenderer: GriddedHandler
};
