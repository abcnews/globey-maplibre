<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import {
    safeParseGlobeJsonBlob,
    formatGlobeJsonBlob,
    type GlobeJsonBlob,
    type GlobeLayer
  } from '../../lib/data/jsonBlob.ts';
  import { blobToDecodedObject, decodedObjectToBlob } from '../../lib/data/blobAdapter.ts';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { BuilderFrame, Loader, Modal } from '@abcnews/components-builder';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { Component } from 'svelte';
  import {
    layerFeatureRegistry,
    layerAddMenuRegistry,
    Z_INDEX_IMAGE_LAYERS,
    getDefaultLayerButtons,
    type LayerItemDescriptor,
    type LayerFeatureDefinition,
    type LayerButton,
    type LayerAddMenuItem
  } from '../features';
  import { safeFitBounds } from './utils.ts';
  import PropList from './PropList.svelte';
  import PropScreenshot from './PropScreenshot.svelte';
  import IframeUrl from './IframeUrl.svelte';
  import { Plus, X } from 'svelte-bootstrap-icons';

  let map = $state<MapLibreMap>();

  // Reactive DecodedObject derived from $jsonBlob
  const currentOptions = $derived(blobToDecodedObject($jsonBlob));

  // Editing state for layer items
  let editingItem = $state<{
    feature: LayerFeatureDefinition<any>;
    descriptor: LayerItemDescriptor<any>;
    data: any;
  } | null>(null);

  let activeCustomModal = $state<Component<any> | null>(null);
  let customModalOptions = $state<typeof currentOptions | null>(null);
  let showAddMenu = $state(false);

  let activePlacement = $state<{
    feature?: LayerFeatureDefinition<any>;
    prompt: string;
    item?: any;
    customHandler?: (coords: [number, number], item?: any) => void;
  } | null>(null);

  // JSON Inspect / Edit Modal state
  let isInspectModalOpen = $state(false);
  let inspectJsonText = $state('');
  let inspectError = $state<string | null>(null);

  // File input ref for loading .txt / .json
  let fileInputEl = $state<HTMLInputElement>();

  // Keep map position synced to jsonBlob.map when the user pans/zooms the globe
  $effect(() => {
    if (!map) return;

    const onMoveEnd = (e: any) => {
      if (!e.originalEvent && !(e as any).builderInitiated) {
        return;
      }
      const center = e.target.getCenter();
      const zoom = e.target.getZoom();

      jsonBlob.update(blob => {
        if (!blob) return blob;
        return {
          ...blob,
          map: {
            ...blob.map,
            coords: [center.lng, center.lat],
            z: zoom
          }
        };
      });
    };

    map.on('moveend', onMoveEnd);
    return () => map?.off('moveend', onMoveEnd);
  });

  // Derived layer stack ordered from top (highest zIndex) to bottom
  const layers = $derived.by(() => {
    const list: (LayerItemDescriptor<any> & {
      feature: LayerFeatureDefinition<any>;
      resolvedButtons: LayerButton<any>[];
    })[] = [];

    layerFeatureRegistry.forEach(feature => {
      const items = feature.getItems(currentOptions);
      items.forEach((item: LayerItemDescriptor<any>) => {
        const itemDescriptorWithFeature = { ...item, feature };
        const rawButtons =
          item.buttons ||
          (typeof feature.buttons === 'function' ? feature.buttons(item, currentOptions) : feature.buttons) ||
          getDefaultLayerButtons(feature, item, currentOptions);

        list.push({
          ...itemDescriptorWithFeature,
          resolvedButtons: rawButtons
        });
      });
    });

    return list.sort((a, b) => b.zIndex - a.zIndex);
  });

  function mutateDecoded(fn: (draftOptions: typeof currentOptions) => void) {
    if (!$jsonBlob) return;
    const cloned = JSON.parse(JSON.stringify(currentOptions));
    fn(cloned);
    const updated = decodedObjectToBlob($jsonBlob, cloned);
    jsonBlob.set(updated);
  }

  function handleReorder(newItems: typeof layers) {
    const total = newItems.length;
    const baseZ = Z_INDEX_IMAGE_LAYERS;

    mutateDecoded(draft => {
      newItems.forEach((item, idx) => {
        const assignedZ = baseZ + (total - 1 - idx) * 10;
        item.feature.setZIndex(draft, item, assignedZ);
      });
    });
  }

  function openEditModal(feature: LayerFeatureDefinition<any>, item: LayerItemDescriptor<any>) {
    editingItem = {
      feature,
      descriptor: item,
      data: JSON.parse(JSON.stringify(item.data))
    };
    showAddMenu = false;
  }

  function startInteractivePlacement(placement: {
    prompt: string;
    onMapClick: (coords: [number, number], item?: any) => void;
  }) {
    editingItem = null;
    activePlacement = {
      prompt: placement.prompt,
      customHandler: placement.onMapClick
    };
  }

  function handleAddMenuItem(menuItem: LayerAddMenuItem) {
    showAddMenu = false;
    editingItem = null;

    if (menuItem.CustomModal) {
      customModalOptions = JSON.parse(JSON.stringify(currentOptions));
      activeCustomModal = menuItem.CustomModal;
    } else if (menuItem.onSelect) {
      menuItem.onSelect({
        options: currentOptions,
        map,
        openModal: (modal: Component<any>) => {
          activeCustomModal = modal;
        }
      });
    } else if (menuItem.feature) {
      addLayer(menuItem.feature);
    }
  }

  function addLayer(feature: LayerFeatureDefinition<any>) {
    showAddMenu = false;
    editingItem = null;

    const maxZ = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 10 : feature.defaultZIndex;
    const newItem = feature.createDefault({ maxZIndex: maxZ, map });

    if (feature.interactivePlacement) {
      activePlacement = {
        feature,
        prompt: feature.interactivePlacement.prompt,
        item: newItem
      };
    } else {
      mutateDecoded(draft => {
        feature.add(draft, newItem);
      });

      if (feature.ConfigModal) {
        openEditModal(feature, {
          id: `${feature.kind}-${Date.now()}`,
          kind: feature.kind,
          name: feature.label,
          description: '',
          zIndex: maxZ,
          data: newItem
        });
      }
    }
  }

  function handleMapClick(e: any) {
    if (!activePlacement) return;
    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    if (activePlacement.customHandler) {
      const handler = activePlacement.customHandler;
      const item = activePlacement.item;
      activePlacement = null;
      handler(coords, item);
      return;
    }

    if (activePlacement.feature) {
      const { feature, item } = activePlacement;
      feature.interactivePlacement?.onMapClick(coords, item);

      mutateDecoded(draft => {
        feature.add(draft, item);
      });

      const placementMaxZ = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 10 : feature.defaultZIndex;
      activePlacement = null;

      if (feature.ConfigModal) {
        openEditModal(feature, {
          id: `${feature.kind}-${Date.now()}`,
          kind: feature.kind,
          name: feature.label,
          description: '',
          zIndex: placementMaxZ,
          data: item
        });
      }
    }
  }

  $effect(() => {
    if (!map) return;
    const mapInstance = map;

    if (activePlacement) {
      mapInstance.getCanvas().style.cursor = 'crosshair';
      mapInstance.on('click', handleMapClick);
    } else {
      mapInstance.getCanvas().style.cursor = '';
      mapInstance.off('click', handleMapClick);
    }

    return () => {
      mapInstance.off('click', handleMapClick);
      if (mapInstance.getCanvas()) mapInstance.getCanvas().style.cursor = '';
    };
  });

  function handleCloseLayerModal(bounds?: [number, number][]) {
    if (bounds && map) {
      safeFitBounds(map, bounds, { padding: 50 });
    }

    if (editingItem) {
      const { feature, descriptor, data } = editingItem;
      const currentData = editingItem.data ?? data;
      console.log('[Builder.layers] Closing layer modal for:', descriptor.name, { descriptor, currentData });

      mutateDecoded(draft => {
        if (feature.isValid && !feature.isValid(currentData, draft)) {
          console.warn('[Builder.layers] Layer invalid on close, deleting:', descriptor.name);
          feature.delete(draft, descriptor);
        } else if (feature.update) {
          console.log('[Builder.layers] Updating layer on close:', descriptor.name, currentData);
          feature.update(draft, descriptor, currentData);
        }
      });
    }

    editingItem = null;
  }

  // --- Load / Save JSON as .txt ---
  function handleSaveTxt() {
    if (!$jsonBlob) return;
    const formatted = formatGlobeJsonBlob($jsonBlob);
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${($jsonBlob.title || 'globy').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-blob.txt`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      const res = safeParseGlobeJsonBlob(content);
      if (!res.success) {
        alert(`Failed to parse file: ${res.error.message}`);
        return;
      }
      jsonBlob.loadJson(res.data);
    };
    reader.readAsText(file);
    target.value = '';
  }

  function handleOpenInspectModal() {
    inspectJsonText = $jsonBlob ? formatGlobeJsonBlob($jsonBlob) : '';
    inspectError = null;
    isInspectModalOpen = true;
  }

  function handleApplyInspectJson() {
    inspectError = null;
    const res = safeParseGlobeJsonBlob(inspectJsonText);
    if (!res.success) {
      inspectError = res.error.message;
      return;
    }
    jsonBlob.loadJson(res.data);
    isInspectModalOpen = false;
  }
</script>

{#snippet Viz()}
  <div class="frame">
    {#if currentOptions.coords}
      <CustomGlobe
        interactive={true}
        options={currentOptions}
        preserveDrawingBuffer={true}
        onLoad={loadedMap => (map = loadedMap)}
      />
    {/if}
  </div>
{/snippet}

{#snippet Sidebar()}
  {#if !map || !$jsonBlob}
    <Loader />
  {:else}
    <!-- Map Config Section -->
    <fieldset class="map-config-fieldset">
      <legend>Map config</legend>

      <div class="form-row-group">
        <div class="form-row flex-1">
          <span class="control-label">Projection</span>
          <div class="radio-group">
            <label>
              <input
                type="radio"
                name="projection"
                value="globe"
                checked={$jsonBlob.map.projection === 'globe'}
                onchange={() => {
                  jsonBlob.update(b => (b ? { ...b, map: { ...b.map, projection: 'globe' } } : b));
                }}
              />
              Globe
            </label>
            <label>
              <input
                type="radio"
                name="projection"
                value="mercator"
                checked={$jsonBlob.map.projection === 'mercator'}
                onchange={() => {
                  jsonBlob.update(b => (b ? { ...b, map: { ...b.map, projection: 'mercator' } } : b));
                }}
              />
              Flat
            </label>
          </div>
        </div>

        <div class="form-row flex-1">
          <label for="animation-duration" class="control-label">Animation (ms)</label>
          <input
            id="animation-duration"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            value={$jsonBlob.map.animationDuration ?? 500}
            oninput={e => {
              const val = e.currentTarget.value.trim();
              const num = val ? Number(val) : 500;
              jsonBlob.update(b => (b ? { ...b, map: { ...b.map, animationDuration: num } } : b));
            }}
            placeholder="500"
          />
        </div>
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={$jsonBlob.map.minimap?.enabled ?? false}
            onchange={e => {
              const enabled = e.currentTarget.checked;
              jsonBlob.update(b => {
                if (!b) return b;
                return {
                  ...b,
                  map: {
                    ...b.map,
                    minimap: enabled ? { enabled: true, bounds: b.map.minimap?.bounds || [] } : undefined
                  }
                };
              });
            }}
          />
          Show minimap
        </label>
      </div>

      <div class="form-row">
        <label for="text-attribution" class="control-label">Attribution</label>
        <div class="input-with-clear">
          <input
            id="text-attribution"
            type="text"
            placeholder="e.g. Map data © ..."
            value={$jsonBlob.map.attribution || ''}
            oninput={e => {
              const val = e.currentTarget.value;
              jsonBlob.update(b => (b ? { ...b, map: { ...b.map, attribution: val } } : b));
            }}
          />
          {#if $jsonBlob.map.attribution}
            <button
              type="button"
              class="btn-icon clear-btn"
              title="Clear attribution"
              aria-label="Clear attribution"
              onclick={() => {
                jsonBlob.update(b => (b ? { ...b, map: { ...b.map, attribution: '' } } : b));
              }}
            >
              <X width="16" height="16" />
            </button>
          {/if}
        </div>
      </div>
    </fieldset>

    <!-- Layers Stack Section -->
    <fieldset class="prop-layers">
      <legend>
        <span>Layers ({layers.length})</span>
        <div class="add-container">
          <button
            class="btn-icon"
            aria-label="Add Layer"
            title="Add Layer"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Plus />
          </button>
          {#if showAddMenu}
            <div class="add-menu">
              {#each layerAddMenuRegistry as menuItem (menuItem.id)}
                {#if !menuItem.canAdd || menuItem.canAdd(currentOptions)}
                  <button type="button" onclick={() => handleAddMenuItem(menuItem)}>
                    <menuItem.icon />
                    {menuItem.label}
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </legend>

      {#if activePlacement}
        <small style:display="block" style:margin-bottom="0.5rem" style:color="#64b5f6">
          {activePlacement.prompt}
        </small>
      {/if}

      {#if layers.length === 0}
        <small>Click <code>+</code> to add a layer</small>
      {:else}
        <PropList items={layers} onchange={handleReorder}>
          {#snippet name(item)}
            {@const Icon = item.feature.icon}
            <span class="layer-name">
              {#if Icon}
                <Icon class="layer-icon" />
              {/if}
              <strong>{item.name}</strong>
            </span>
          {/snippet}
          {#snippet description(item)}
            <span class="layer-desc">{item.description}</span>
          {/snippet}
          {#snippet actions(item)}
            {#each item.resolvedButtons as btn (btn.id)}
              <button
                type="button"
                class="btn-icon"
                aria-label={btn.ariaLabel || btn.title}
                title={btn.title}
                onclick={() => {
                  mutateDecoded(draft => {
                    const draftItems = item.feature.getItems(draft);
                    const draftItem = {
                      ...(draftItems.find(i => i.id === item.id) || draftItems[0] || item),
                      feature: item.feature
                    };

                    btn.onclick({
                      options: draft,
                      item: draftItem,
                      map,
                      startInteractivePlacement,
                      openModal: () => {
                        const currentItems = item.feature.getItems(currentOptions);
                        const matchingItem = currentItems.find(i => i.id === item.id) || currentItems[0] || item;
                        openEditModal(item.feature, matchingItem);
                      }
                    });
                  });
                }}
              >
                <btn.icon />
              </button>
            {/each}
          {/snippet}
        </PropList>
      {/if}
    </fieldset>

    <!-- Tools & File I/O Section -->
    <fieldset>
      <legend>Tools</legend>

      <div style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <input
          id="reduced-motion-toggle"
          type="checkbox"
          checked={document.body.classList.contains('is-reduced-motion')}
          onchange={e => {
            document.body.classList.toggle('is-reduced-motion', e.currentTarget.checked);
          }}
        />
        <label for="reduced-motion-toggle">Reduced motion preview</label>
      </div>

      <IframeUrl />
      <PropScreenshot {map} />

      <button type="button" onclick={handleSaveTxt}>
        Save JSON as .txt
      </button>

      <input
        type="file"
        accept=".txt,.json"
        style="display: none"
        bind:this={fileInputEl}
        onchange={handleFileSelected}
      />
      <button type="button" onclick={() => fileInputEl?.click()}>
        Load JSON from .txt
      </button>

      <button type="button" onclick={handleOpenInspectModal}>
        Inspect JSON blob
      </button>

      <button
        type="button"
        onclick={() => {
          if (confirm('Exit current session and return to first-run screen?')) {
            jsonBlob.clear();
          }
        }}
      >
        Exit session
      </button>
    </fieldset>
  {/if}
{/snippet}

<BuilderFrame {Viz} {Sidebar} />

<!-- Modals -->
{#if editingItem?.feature.ConfigModal}
  <editingItem.feature.ConfigModal bind:config={editingItem.data} {map} onclose={handleCloseLayerModal} />
{/if}

{#if activeCustomModal && customModalOptions}
  {@const CustomModalComponent = activeCustomModal}
  <CustomModalComponent
    bind:options={customModalOptions}
    {map}
    onclose={(bounds?: [number, number][]) => {
      if (bounds && map) {
        safeFitBounds(map, bounds, { padding: 50 });
      }
      mutateDecoded(draft => {
        Object.assign(draft, customModalOptions);
      });
      activeCustomModal = null;
      customModalOptions = null;
    }}
  />
{/if}

{#if isInspectModalOpen}
  <Modal onClose={() => (isInspectModalOpen = false)} title="Inspect JSON Blob">
    <div class="inspect-modal-content">
      {#if inspectError}
        <div class="inspect-error">{inspectError}</div>
      {/if}
      <textarea bind:value={inspectJsonText} spellcheck="false"></textarea>
    </div>
    {#snippet footerChildren()}
      <button type="button" onclick={handleApplyInspectJson}>Apply</button>
      <button type="button" onclick={() => (isInspectModalOpen = false)}>Cancel</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .frame {
    width: 100%;
    height: 100%;
    border: 0;
    position: relative;
  }

  .map-config-fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-row-group {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    width: 100%;
  }

  .flex-1 {
    flex: 1;
    min-width: 0;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .control-label {
    font-size: 0.85rem;
    color: var(--text-light, #888);
    font-weight: 500;
  }

  .radio-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    min-height: 1.8rem;
  }

  .radio-group label,
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text, #ccc);
  }

  .input-with-clear {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-with-clear input {
    width: 100%;
    padding-right: 2rem;
  }

  .clear-btn {
    position: absolute;
    right: 0.25rem;
    color: var(--text-light, #888);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    color: var(--text, #ccc);
  }

  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .prop-layers legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .add-container {
    position: relative;
    display: inline-block;
  }

  .add-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    padding: 0.25rem 0;
    display: flex;
    flex-direction: column;
    z-index: 100;
    min-width: 140px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .add-menu button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--text, #ccc);
    padding: 0.4rem 0.75rem;
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    width: 100%;
    border-radius: 0;
  }

  .add-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .layer-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.layer-icon) {
    flex-shrink: 0;
    opacity: 0.8;
  }

  .layer-desc {
    color: var(--text-light, #888);
  }

  .inspect-modal-content {
    width: 90vw;
    max-width: 50em;
  }

  .inspect-modal-content textarea {
    width: 100%;
    height: 50vh;
    font-family: monospace;
    font-size: 0.85rem;
    box-sizing: border-box;
  }

  .inspect-error {
    color: #ff6b6b;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 4px;
  }
</style>
