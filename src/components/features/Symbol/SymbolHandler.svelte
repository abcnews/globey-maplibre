<script lang="ts">
  import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import { pickStop } from '../layers/tweenedLayers.ts';
  import { getTween } from '../Tween/context.ts';
  import SymbolAnnotation from './SymbolAnnotation.svelte';
  import SymbolIcon from './SymbolIcon.svelte';

  let { config, opacityStops, coordStops }: LayerRendererProps<SymbolLayer> = $props();

  const tween = getTween();

  /** One `[lng, lat]` per panel (via `symbolFeature.coordsOf`); null where the symbol is absent. */
  const coordsPerPanel = $derived(coordStops as ([number, number] | null)[]);

  // The coordinate snap reads the layer clock's panel index, so the icon and its annotation move
  // together and stay in step with the fade.
  const coords = $derived(
    pickStop(coordsPerPanel, tween.clock(config.animationClock ?? 'scroll').fromPanel, config.coords ?? [0, 0])
  );
</script>

{#if !config.hideSymbol}
  <SymbolIcon {config} {opacityStops} {coords} />
{/if}

{#if config.annotation?.trim()}
  <SymbolAnnotation {config} {opacityStops} {coords} />
{/if}
