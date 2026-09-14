import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { DecodedObject, MapLabelsConfig } from '../../../lib/marker';
import { DEFAULT_MAP_LABELS, DISABLED_MAP_LABELS } from '../../../lib/marker/utils.ts';
import { Z_INDEX_BASE_LABELS } from '../layers/layerUtils.ts';
import { Tag as LabelIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderMapLabelsConfigModal from './BuilderMapLabelsConfigModal.svelte';

export const mapLabelsFeature: LayerFeatureDefinition<MapLabelsConfig> = {
  kind: 'mapLabels',
  label: 'Map Labels',
  icon: LabelIcon,
  defaultZIndex: Z_INDEX_BASE_LABELS,
  isMultiItem: false,

  buttons: [
    createEditButton<MapLabelsConfig>({ title: 'Edit map labels' }),
    createDeleteButton<MapLabelsConfig>({ title: 'Hide map labels' })
  ],

  // Map labels are on by default (absent options.mapLabels means "use the
  // defaults"), so they're only addable again once explicitly deleted.
  canAdd(options: DecodedObject) {
    return (options.mapLabels as any)?._disabled === true;
  },

  createDefault(): MapLabelsConfig {
    return {
      ...DEFAULT_MAP_LABELS,
      continents: true,
      states: true,
      cities: true,
      towns: true,
      oceans: true
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<MapLabelsConfig>[] {
    if ((options.mapLabels as any)?._disabled === true) return [];
    return [
      {
        id: 'map-labels',
        kind: 'mapLabels',
        name: 'Map Labels',
        zIndex: options.mapLabelsZIndex ?? Z_INDEX_BASE_LABELS,
        data: options.mapLabels ?? DEFAULT_MAP_LABELS
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<MapLabelsConfig>, newZIndex: number) {
    // Materialise the default config so the z-index change has something to
    // attach to — otherwise decodedObjectToBlob has no mapLabels object to persist.
    if (!options.mapLabels) {
      options.mapLabels = { ...DEFAULT_MAP_LABELS };
    }
    options.mapLabelsZIndex = newZIndex;
  },

  add(options: DecodedObject, item: MapLabelsConfig) {
    options.mapLabels = {
      countriesMajor: item?.countriesMajor ?? true,
      countriesMedium: item?.countriesMedium ?? true,
      countriesMinor: item?.countriesMinor ?? true,
      continents: item?.continents ?? true,
      states: item?.states ?? true,
      cities: item?.cities ?? true,
      towns: item?.towns ?? true,
      oceans: item?.oceans ?? true,
      nationalBoundaries: item?.nationalBoundaries ?? true,
      stateBoundaries: item?.stateBoundaries ?? false
    };
    delete (options.mapLabels as any)._disabled;
  },

  update(options: DecodedObject, _descriptor: LayerItemDescriptor<MapLabelsConfig>, data: MapLabelsConfig) {
    options.mapLabels = data;
  },

  delete(options: DecodedObject) {
    // Deleting when mapLabels is still absent (the default-on state) must also
    // work — it can't rely on an existing options.mapLabels object to update.
    options.mapLabels = {
      ...DISABLED_MAP_LABELS,
      ...({ _disabled: true } as any)
    };
  },

  ConfigModal: BuilderMapLabelsConfigModal
};

export { default as BuilderMapLabelsConfigModal } from './BuilderMapLabelsConfigModal.svelte';
