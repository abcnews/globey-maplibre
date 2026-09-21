<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import {
    safeParseGlobeJsonBlob,
    formatGlobeJsonBlob,
    globeJsonBlobSchema,
    type GlobeJsonBlob,
    type GlobeLayer
  } from '../../lib/data/jsonBlob.ts';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { BuilderFrame, Loader, Modal } from '@abcnews/components-builder';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { Component } from 'svelte';
  import {
    layerFeatureRegistry,
    layerAddMenuRegistry,
    featureForKind,
    getDefaultLayerButtons,
    addLayer as addLayerToBlob,
    updateLayer,
    deleteLayer,
    describeLayer,
    canAddFeature,
    findLayer,
    type LayerItemDescriptor,
    type LayerFeatureDefinition,
    type LayerButton,
    type LayerAddMenuItem
  } from '../features';
  import { safeFitBounds } from '../features/PanZoom/utils.ts';
  import PropList from './PropList.svelte';
  import PropScreenshot from './PropScreenshot.svelte';
  import IframeUrl from './IframeUrl.svelte';
  import { Plus, X } from 'svelte-bootstrap-icons';

  interface Props {
    /** Shared MapLibre instance, lifted to Builder.svelte so BuilderTopBar's location search can drive it too. */
    map?: MapLibreMap;
  }

  let { map = $bindable() }: Props = $props();

  // The blob is the working representation — no adapter, no re-derivation.
  // Falls back to an empty blob before one is loaded, so the panel can render its
  // (empty) layer list rather than every read having to null-check. `mutateBlob`
  // refuses to commit against that placeholder.
  const currentOptions = $derived($jsonBlob ?? globeJsonBlobSchema.parse({}));

  // Editing state for layer items
  let editingItem = $state<{
    feature: LayerFeatureDefinition<any>;
    descriptor: LayerItemDescriptor<any>;
    data: any;
  } | null>(null);

  let activeCustomModal = $state<Component<any> | null>(null);
  let customModalOptions = $state<typeof currentOptions | null>(null);
  let showAddMenu = $state(false);
  let addMenuContainer = $state<HTMLDivElement>();

  /** Closes the add-layer menu on any click outside its own trigger/dropdown. */
  function handleWindowClick(event: MouseEvent) {
    if (showAddMenu && !addMenuContainer?.contains(event.target as Node)) {
      showAddMenu = false;
    }
  }

  let activePlacement = $state<{
    feature?: LayerFeatureDefinition<any>;
    prompt: string;
    item?: any;
    customHandler?: (coords: [number, number], item: any, options: typeof currentOptions) => void;
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

  /**
   * The blob's layer stack, presented top-first (the list reads like the map looks, and
   * `blob.layers` index 0 is the bottom). Layers whose `type` has no registered feature
   * are skipped rather than rendered without controls.
   */
  const layers = $derived.by(() =>
    currentOptions.layers
      .map((layer, index) => {
        const feature = featureForKind(layer.type);
        if (!feature) return undefined;

        const item = describeLayer(feature, layer, index);
        const resolvedButtons =
          item.buttons ||
          (typeof feature.buttons === 'function' ? feature.buttons(item, currentOptions) : feature.buttons) ||
          getDefaultLayerButtons(feature, item, currentOptions);

        return { ...item, feature, resolvedButtons };
      })
      .filter(
        (
          item
        ): item is LayerItemDescriptor<any> & {
          feature: LayerFeatureDefinition<any>;
          resolvedButtons: LayerButton<any>[];
        } => item !== undefined
      )
      .toReversed()
  );

  /** Standard clone→mutate→commit wrapper for any change to the blob. */
  function mutateBlob(fn: (draft: GlobeJsonBlob) => void) {
    if (!$jsonBlob) return;
    const draft = structuredClone($jsonBlob);
    fn(draft);
    jsonBlob.set(draft);
  }

  /** PropList hands back the list in its new top-first order; the blob stores bottom-first. */
  function handleReorder(newItems: typeof layers) {
    const reordered = newItems.toReversed().map(item => item.data as GlobeLayer);
    mutateBlob(draft => {
      draft.layers = reordered;
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
    onMapClick: (coords: [number, number], item: any, options: GlobeJsonBlob) => void;
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
      customModalOptions = structuredClone($state.snapshot(currentOptions));
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

    const newItem = feature.createDefault({ map });

    if (feature.interactivePlacement) {
      activePlacement = {
        feature,
        prompt: feature.interactivePlacement.prompt,
        item: newItem
      };
      return;
    }

    mutateBlob(draft => addLayerToBlob(draft, newItem));
    // Opened straight away so the layer's own settings (timing, friendly name) are
    // editable on create, not just on a later edit.
    if (feature.ConfigModal) {
      openEditModal(feature, describeLayer(feature, newItem, currentOptions.layers.length - 1));
    }
  }

  function handleMapClick(e: any) {
    if (!activePlacement) return;
    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    if (activePlacement.customHandler) {
      const handler = activePlacement.customHandler;
      const item = activePlacement.item;
      activePlacement = null;
      // Re-enter mutateBlob here (at actual click time) rather than relying on the
      // draft passed to the button's onclick — that draft is already discarded by the
      // time an async map click fires, so mutating it silently loses the change.
      mutateBlob(draft => {
        handler(coords, item, draft);
      });
      return;
    }

    if (activePlacement.feature) {
      const { feature, item } = activePlacement;
      feature.interactivePlacement?.onMapClick(coords, item);

      mutateBlob(draft => addLayerToBlob(draft, item));
      activePlacement = null;

      if (feature.ConfigModal) {
        openEditModal(feature, describeLayer(feature, item, currentOptions.layers.length - 1));
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

      mutateBlob(draft => {
        if (feature.isValid && !feature.isValid(currentData, draft)) {
          console.warn('[Builder.layers] Layer invalid on close, deleting:', descriptor.name);
          deleteLayer(draft, descriptor.id);
        } else {
          updateLayer(draft, descriptor.id, currentData);
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
    const filename = `${($jsonBlob.title || 'globey').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-blob.txt`;
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
    {#if $jsonBlob}
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
        <div class="add-container" bind:this={addMenuContainer}>
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
                {#if menuItem.feature ? canAddFeature(menuItem.feature, currentOptions) : (menuItem.canAdd?.(currentOptions) ?? true)}
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
          {#snippet actions(item)}
            {#each item.resolvedButtons as btn (btn.id)}
              <button
                type="button"
                class="btn-icon"
                aria-label={btn.ariaLabel || btn.title}
                title={btn.title}
                onclick={() => {
                  mutateBlob(draft => {
                    const draftLayer = findLayer(draft, item.id);
                    const draftItem = draftLayer ? describeLayer(item.feature, draftLayer, item.index) : item;

                    btn.onclick({
                      options: draft,
                      item: draftItem,
                      map,
                      startInteractivePlacement,
                      openModal: (overrideOptions?: GlobeJsonBlob) => {
                        // Interactive-placement handlers (e.g. CustomLabels' "add label")
                        // call this from inside the current mutateBlob's fn, before
                        // jsonBlob.set() commits — currentOptions is still stale at that
                        // point, so prefer the caller's own mutated draft when given one.
                        const source = overrideOptions ?? currentOptions;
                        const layer = findLayer(source, item.id);
                        openEditModal(item.feature, layer ? describeLayer(item.feature, layer, item.index) : item);
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

      <button type="button" onclick={handleSaveTxt}> Save JSON as .txt </button>

      <input
        type="file"
        accept=".txt,.json"
        style="display: none"
        bind:this={fileInputEl}
        onchange={handleFileSelected}
      />
      <button type="button" onclick={() => fileInputEl?.click()}> Load JSON from .txt </button>

      <button type="button" onclick={handleOpenInspectModal}> Inspect JSON blob </button>
    </fieldset>
  {/if}
{/snippet}

<svelte:window onclick={handleWindowClick} />

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
      mutateBlob(draft => {
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
