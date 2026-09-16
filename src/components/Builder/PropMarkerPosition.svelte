<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import { Search } from 'svelte-bootstrap-icons';
  import { Modal } from '@abcnews/components-builder';
  import GeoSearch from '../Builder.legacy/GeoSearch/GeoSearch.svelte';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_UI_OVERLAYS } from '../features';
  import { safeFitBounds } from './utils.ts';

  /**
   * Ports the legacy builder's "Positioning" feature (location search + click-to-pick
   * bounds, see Builder.legacy/PropCoord.svelte + PropBounds.svelte) to Marker Mode.
   * Unlike the legacy version this doesn't touch a whole-page `options` store — it
   * writes straight to a marker's BBOX. The raw picked points are kept as-is (not
   * reduced to a bounding rectangle) so reopening picking mode shows exactly what was
   * picked before, and `encodeGeohashBounds`/`decodeGeohashBounds` round-trip any
   * number of points.
   */

  interface Props {
    map?: MapLibreMap;
    bbox?: [number, number][];
    onchange: (bbox: [number, number][] | undefined) => void;
  }

  let { map, bbox, onchange }: Props = $props();

  let isSearchModalOpen = $state(false);
  let isPicking = $state(false);
  let points = $state<[number, number][]>(bbox ?? []);

  // Sync incoming bbox -> local points when it changes from elsewhere (e.g. a
  // pasted/loaded marker), but not while the user is actively picking.
  $effect(() => {
    if (!isPicking) {
      points = bbox ?? [];
    }
  });

  $effect(() => {
    if (!map || !isPicking) return;

    const sourceId = 'marker-bounds-points';
    const layerId = 'marker-bounds-points-layer';

    const updateSource = () => {
      const source = map.getSource(sourceId) as any;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: points.map((p, i) => ({
            type: 'Feature',
            id: i,
            geometry: { type: 'Point', coordinates: p },
            properties: {}
          }))
        });
      }
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      addLayerWithZIndex(
        map,
        {
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 8,
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        },
        Z_INDEX_UI_OVERLAYS
      );
    }

    updateSource();

    const onClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (features.length > 0) {
        const id = features[0].id as number;
        points = points.filter((_, i) => i !== id);
      } else {
        points = [...points, [e.lngLat.lng, e.lngLat.lat]];
      }
      updateSource();
    };

    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
      removeLayerWithZIndex(map, layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  function togglePicking() {
    if (isPicking && points.length > 0 && map) {
      const lats = points.map(p => p[1]);
      const lngs = points.map(p => p[0]);
      safeFitBounds(
        map,
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        ],
        { padding: 50 }
      );
      onchange(points);
    }
    isPicking = !isPicking;
  }

  function clearBounds() {
    points = [];
    onchange(undefined);
  }

  function onGeoSelect(result: { name: string; coords: [number, number] }) {
    map?.flyTo({ center: result.coords, zoom: Math.max(map.getZoom(), 6) });
    isSearchModalOpen = false;
  }
</script>

<div class="positioning">
  <div class="row">
    <button
      class="btn-icon"
      type="button"
      aria-label="Search location"
      title="Search location"
      onclick={() => (isSearchModalOpen = true)}
    >
      <Search />
    </button>
    <button type="button" onclick={togglePicking}>
      {isPicking ? 'Finish picking' : 'Pick BBOX on map'}
    </button>
    {#if bbox && bbox.length > 0}
      <button type="button" onclick={clearBounds}>Clear (scroll-tied)</button>
    {/if}
  </div>

  {#if isPicking}
    <small class="hint">Click on map to add points. Click a point to remove it.</small>
  {:else if bbox && bbox.length > 0}
    <small class="hint">{bbox.length} point{bbox.length === 1 ? '' : 's'} set.</small>
  {:else}
    <small class="hint">No BBOX set — this marker inherits scroll-tied camera position.</small>
  {/if}
</div>

{#if isSearchModalOpen}
  <Modal onClose={() => (isSearchModalOpen = false)} title="Search Location">
    <div class="search-modal-content">
      <GeoSearch onselect={onGeoSelect} />
    </div>
  </Modal>
{/if}

<style>
  .positioning {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .hint {
    color: var(--text-light, #888);
  }

  .search-modal-content {
    width: 90vw;
    max-width: 32rem;
    min-height: 24rem;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0;
    box-sizing: border-box;
  }
</style>
