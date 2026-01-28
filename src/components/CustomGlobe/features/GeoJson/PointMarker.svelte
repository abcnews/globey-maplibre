<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { evaluateColor, evaluateOpacity } from './utils';

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

    marker = new maplibregl.Marker({ element }).setLngLat(coords as [number, number]).addTo(map);

    return () => {
      marker?.remove();
    };
  });

  // Reactivity for style
  let color = $derived(evaluateColor(config, feature));
  let opacity = $derived(evaluateOpacity(config, feature));
</script>

<div bind:this={element} class="custom-point-marker" style:--color={color} style:opacity></div>

<style>
  .custom-point-marker {
    width: 12px;
    height: 12px;
    background-color: var(--color);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 50%;
    transition:
      opacity 0.3s ease,
      background-color 0.3s ease;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
</style>
