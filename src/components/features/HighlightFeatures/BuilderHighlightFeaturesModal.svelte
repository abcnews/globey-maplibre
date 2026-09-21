<script lang="ts">
  import { Modal, Typeahead, Loader } from '@abcnews/components-builder';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { GlobeJsonBlob, GeoJsonAreasLayer } from '../../../lib/data/jsonBlob.ts';
  import { newLayerId } from '../utils/layerOps.ts';
  import { DEFAULT_FEATURE_SETS, fetchFeatureSetIndex, getFeatureFileUrl, type FeatureSetItem } from './featureSets.ts';

  interface Props {
    /** Decoded marker options */
    options: GlobeJsonBlob;
    /** MapLibre map instance if available */
    map?: MapLibreMap;
    /** Callback when the modal requests to close */
    onclose?: (bounds?: [number, number][]) => void;
  }

  let { options = $bindable(), onclose }: Props = $props();

  let selectedSetId = $state(DEFAULT_FEATURE_SETS[0].id);
  let isLoadingIndex = $state(false);
  let indexError = $state<string | undefined>();
  let allItems = $state<FeatureSetItem[]>([]);
  let selectedFilenames = $state<string[]>([]);

  const activeSet = $derived.by(() => {
    return DEFAULT_FEATURE_SETS.find(s => s.id === selectedSetId) || DEFAULT_FEATURE_SETS[0];
  });

  // Typeahead options mapped to { label, value }
  const typeaheadOptions = $derived.by(() => {
    return allItems.map(item => ({
      label: item.name,
      value: item.filename
    }));
  });

  // Fetch index whenever activeSet changes
  $effect(() => {
    const currentSet = activeSet;
    let isCancelled = false;

    async function loadIndex() {
      isLoadingIndex = true;
      indexError = undefined;
      try {
        const items = await fetchFeatureSetIndex(currentSet);
        if (!isCancelled) {
          allItems = items;
          isLoadingIndex = false;
        }
      } catch (err: any) {
        if (!isCancelled) {
          indexError = err.message || 'Failed to load feature set';
          isLoadingIndex = false;
        }
      }
    }

    loadIndex();

    return () => {
      isCancelled = true;
    };
  });

  function handleAdd() {
    if (selectedFilenames.length === 0) return;

    const selectedItems = allItems.filter(item => selectedFilenames.includes(item.filename));
    if (selectedItems.length === 0) return;

    const newLayers: GeoJsonAreasLayer[] = selectedItems.map(item => ({
      id: newLayerId('geojsonAreas'),
      type: 'geojsonAreas',
      url: getFeatureFileUrl(activeSet, item),
      colourMode: 'basic',
      colourConfig: {
        basicType: 'normal',
        minColour: '#ffffff',
        maxColour: '#ff0000',
        paletteType: 'sequential',
        paletteVariant: 'Blue'
      },
      isOpaque: false,
      name: item.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    // Appended, so they land on top of the stack in selection order.
    options.layers = [...options.layers, ...newLayers];

    onclose?.();
  }
</script>

{#snippet footerChildren()}
  <button type="button" onclick={() => onclose?.()}> Cancel </button>
  <button type="button" disabled={selectedFilenames.length === 0} onclick={handleAdd}>
    {selectedFilenames.length === 0
      ? 'Select features to add'
      : selectedFilenames.length === 1
        ? 'Add 1 Feature'
        : `Add ${selectedFilenames.length} Features`}
  </button>
{/snippet}

<Modal title="Highlight Features" position="right" onClose={() => onclose?.()} {footerChildren}>
  <div class="highlight-modal">
    <fieldset>
      <legend><label for="feature-set-select">Feature Set</label></legend>
      <select id="feature-set-select" bind:value={selectedSetId}>
        {#each DEFAULT_FEATURE_SETS as set (set.id)}
          <option value={set.id}>{set.name}</option>
        {/each}
      </select>
    </fieldset>

    <fieldset>
      <legend>Features</legend>

      {#if isLoadingIndex}
        <div class="loading-container">
          <Loader />
          <span>Loading dataset...</span>
        </div>
      {:else if indexError}
        <div class="error-msg">{indexError}</div>
      {:else}
        <div class="field-group">
          <div class="typeahead-header">
            <label for="hf-typeahead">Search & Select</label>
            <div class="actions">
              {#if allItems.length > 0 && selectedFilenames.length < allItems.length}
                <button
                  type="button"
                  class="btn-text-action select-all"
                  onclick={() => (selectedFilenames = allItems.map(item => item.filename))}
                >
                  Select all ({allItems.length})
                </button>
              {/if}
              {#if selectedFilenames.length > 0}
                <button type="button" class="btn-text-action clear-all" onclick={() => (selectedFilenames = [])}>
                  Clear all ({selectedFilenames.length})
                </button>
              {/if}
            </div>
          </div>

          <Typeahead
            values={typeaheadOptions}
            value={selectedFilenames}
            onChange={vals => (selectedFilenames = vals)}
            disabled={isLoadingIndex}
          />
        </div>
      {/if}
    </fieldset>
  </div>
</Modal>

<style>
  .highlight-modal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 340px;
  }

  .loading-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 0;
    font-size: 0.85rem;
    color: var(--text-light, #888);
  }

  .error-msg {
    color: var(--builder-color-danger, #ff6b6b);
    font-size: 0.85rem;
    padding: 0.5rem 0;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .typeahead-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-text-action {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .btn-text-action.select-all {
    color: #90caf9;
  }

  .btn-text-action.select-all:hover {
    color: #bbdefb;
  }

  .btn-text-action.clear-all {
    color: #ff8a80;
  }

  .btn-text-action.clear-all:hover {
    color: #ff5252;
  }
</style>
