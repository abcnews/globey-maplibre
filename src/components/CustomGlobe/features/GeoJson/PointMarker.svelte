<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { evaluateColor, evaluateOpacity, evaluateSymbol } from './utils';

  let { feature, config, map } = $props<{
    feature: any;
    config: GeoJsonConfig;
    map: maplibregl.Map;
  }>();

  let marker = $state<maplibregl.Marker | undefined>();
  let element = $state<HTMLElement | undefined>();

  $effect(() => {
    if (!element || !map) return;
    const coords = feature.geometry.coordinates;

    // Ensure coords are valid [lng, lat]
    if (!Array.isArray(coords) || coords.length < 2) return;

    const popup = new maplibregl.Popup({ offset: 25 });
    const title = feature.properties?.title;
    const description = feature.properties?.description;

    if (title || description) {
      let content = '';
      if (title) content += `<strong>${title}</strong><br>`;
      if (description) content += description;
      popup.setHTML(content);
    }

    marker = new maplibregl.Marker({ element })
      .setLngLat(coords as [number, number])
      .setPopup(title || description ? popup : undefined)
      .addTo(map);

    return () => {
      marker?.remove();
    };
  });

  // Reactivity for style
  let color = $derived(evaluateColor(config, feature));
  let opacity = $derived(evaluateOpacity(config, feature));
  let symbol = $derived(evaluateSymbol(config, feature));
  let size = $derived.by(() => {
    if (config.colorMode !== 'simple') return 12;
    const s = feature.properties?.['marker-size'];
    if (s === 'small') return 8;
    if (s === 'large') return 18;
    if (typeof s === 'number') return s;
    return 12; // medium / default
  });
</script>

<div bind:this={element} class="custom-point-marker" style:--color={color} style:--size="{size}px" style:opacity>
  {#if symbol}
    <span class="symbol">{symbol}</span>
  {/if}
</div>

<style>
  .custom-point-marker {
    width: var(--size);
    height: var(--size);
    background-color: var(--color);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      opacity 0.3s ease,
      background-color 0.3s ease,
      width 0.3s ease,
      height 0.3s ease;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    color: white; /* fallback for symbols if background is dark */
    font-size: calc(var(--size) * 0.7);
    font-weight: bold;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }

  .symbol {
    pointer-events: none;
  }
</style>
