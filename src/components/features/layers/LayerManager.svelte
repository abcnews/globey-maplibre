<script lang="ts">
  import type { Component } from 'svelte';
  import type { GlobeLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import type { LayerRendererProps } from '../types.ts';
  import { layerFeatureRegistry } from '../index.ts';
  import { buildTweenedLayerEntries, type TweenedLayerEntry } from './tweenedLayers.ts';

  // One stacked layer array per panel (built by CustomGlobe) — all panels, so layers fade rather than snap.
  let { perPanelStacked = [] }: { perPanelStacked?: Stacked<GlobeLayer>[][] } = $props();

  interface RenderedLayer {
    Renderer: Component<LayerRendererProps<any>>;
    entry: TweenedLayerEntry<Stacked<GlobeLayer>, unknown>;
  }

  /**
   * Every registered feature with a `LayerRenderer` gets its layers tweened across panels here,
   * so adding a new kind to `layerFeatureRegistry` is enough to get it on the map.
   */
  const renderedLayers: RenderedLayer[] = $derived(
    layerFeatureRegistry
      .filter(feature => feature.LayerRenderer)
      .flatMap(feature =>
        buildTweenedLayerEntries(
          perPanelStacked.map(panel => panel.filter(layer => layer.type === feature.kind)),
          { keyOf: layer => layer.id, coordsOf: feature.coordsOf }
        ).map(entry => ({ Renderer: feature.LayerRenderer!, entry }))
      )
  );
</script>

{#each renderedLayers as { Renderer, entry } (entry.key)}
  <Renderer
    config={entry.representative}
    opacityStops={entry.opacityStops}
    coordStops={entry.coordStops}
    configStops={entry.configStops}
  />
{/each}
