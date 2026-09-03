<script lang="ts">
  import { getContext } from 'svelte';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { prefersReducedMotion, disableMapAnimation } from '../../../lib/stores';
  import { fetchGeoJsonData, buildFeatureClasses, GEOJSON_POSITION_STATE, type FeatureClasses } from './utils.ts';
  import { generateGeoJsonSourceId, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
  import { getTween } from '../Tween/context.ts';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

  const mapRoot = getContext<{ map: MapLibreMap | null }>('mapInstance');
  const tween = getTween();

  /** Stable identity for a config item across panels (id, else URL, else CMID). */
  function itemKeyOf(item: GeoJsonConfig): string {
    return item.id || item.url || (item.cmid ? String(item.cmid) : '');
  }

  // One config array per panel on the scrollyteller path; the single `config`
  // prop on the builder / static path.
  const panelConfigs = $derived<GeoJsonConfig[][]>(
    tween.panelCount > 0
      ? tween.panels.map(panel => (panel.data.geoJson ?? []) as GeoJsonConfig[])
      : [config]
  );

  // Every distinct item that appears in any panel, first-seen order, with its
  // per-panel config (undefined where the item is absent) and a signature that
  // changes only when that per-panel config set changes (builder edits).
  const items = $derived.by(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const arr of panelConfigs) {
      for (const item of arr) {
        const key = itemKeyOf(item);
        if (key && !seen.has(key)) {
          seen.add(key);
          order.push(key);
        }
      }
    }
    return order.map((key, index) => {
      const perPanel = panelConfigs.map(arr => arr.find(it => itemKeyOf(it) === key));
      const representative = perPanel.find(Boolean) as GeoJsonConfig;
      const sig = `${key}|${JSON.stringify(perPanel.map(c => c ?? null))}`;
      return { key, index, sig, representative, perPanel };
    });
  });

  // Fetched GeoJSON, keyed by item key (URL / CMID never change → fetch once).
  let dataByKey = $state<Record<string, any>>({});
  // Class breakdown, keyed by signature (rebuilt only when a builder edit changes
  // an item's per-panel config; stable for the life of a scrollyteller).
  let classesBySig = $state<Record<string, FeatureClasses>>({});

  $effect(() => {
    for (const item of items) {
      if (classesBySig[item.sig]) continue;

      const loadData = dataByKey[item.key]
        ? Promise.resolve(dataByKey[item.key])
        : fetchGeoJsonData({ cmid: item.representative.cmid, url: item.representative.url });

      loadData
        .then(data => {
          if (!data) return;
          if (!dataByKey[item.key]) dataByKey = { ...dataByKey, [item.key]: data };
          const classes = buildFeatureClasses(data, item.perPanel);
          classesBySig = { ...classesBySig, [item.sig]: classes };
        })
        .catch(e => console.error(`[GeoJsonHandler] Error loading GeoJSON ${item.key}:`, e));
    }
  });

  // One global-state write per frame drives every class layer's paint uniform —
  // O(1), independent of feature count. At rest it sits on an integer panel
  // index; reduced motion snaps to the nearest one.
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
  $effect(() => {
    const map = mapRoot?.map;
    if (!map) return;

    const position =
      tween.panelCount === 0
        ? 0
        : tween.fromPanel + (reducedMotion ? (tween.t < 0.5 ? 0 : 1) : tween.easedT);

    map.setGlobalStateProperty(GEOJSON_POSITION_STATE, position);
  });
</script>

{#each items as item (item.sig)}
  {#if dataByKey[item.key] && classesBySig[item.sig]}
    <GeoJsonRenderer
      data={dataByKey[item.key]}
      classStates={classesBySig[item.sig].classStates}
      perPanelConfigs={item.perPanel}
      config={item.representative}
      sourceId={generateGeoJsonSourceId(item.key)}
      zIndex={item.representative.zIndex ?? Z_INDEX_GEOJSON + item.index * 0.1}
    />
  {/if}
{/each}
