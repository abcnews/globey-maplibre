<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import type { GeoJsonFeatureState } from './utils.ts';
  import { getTween } from '../Tween/context.ts';
  import { tdbg, refId } from '../../../lib/tweenDebug.ts';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';
  import RenderSpike from './RenderSpike.svelte';

  let {
    data,
    classStates,
    perPanelConfigs,
    config,
    sourceId,
    zIndex
  }: {
    data: any;
    /** `classStates[classIndex][panelIndex]` — one class's resolved state per panel. */
    classStates: GeoJsonFeatureState[][];
    /** This item's config in each panel; `undefined` where it is absent. */
    perPanelConfigs: (GeoJsonConfig | undefined)[];
    /** Representative (first non-empty) config — layer type, km sizing, z-index. */
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  const tween = getTween();

  // Spikes keep their own per-panel animation, so hand them the current panel's
  // config (2D layers are class-based and take the representative config).
  const spikeConfig = $derived(
    perPanelConfigs[Math.min(tween.fromPanel, perPanelConfigs.length - 1)] ?? config
  );

  // DEBUG: this component owns the source. Every mount/unmount is a full source
  // teardown + re-tessellation — the flash.
  $effect(() => {
    tdbg(`GeoJsonRenderer MOUNT ${sourceId}`, {
      type: config.type,
      classStates: refId(classStates),
      data: refId(data),
      zIndex
    });
    return () => tdbg(`GeoJsonRenderer UNMOUNT ${sourceId}`);
  });
</script>

{#if config.type === 'areas'}
  <RenderArea {data} {classStates} {config} {sourceId} {zIndex} />
{:else if config.type === 'lines'}
  <RenderLine {data} {classStates} {config} {sourceId} {zIndex} />
{:else if config.type === 'points'}
  <RenderPoint {data} {classStates} {config} {sourceId} {zIndex} />
{:else if config.type === 'spikes'}
  <RenderSpike {data} config={spikeConfig} {sourceId} {zIndex} />
{/if}
