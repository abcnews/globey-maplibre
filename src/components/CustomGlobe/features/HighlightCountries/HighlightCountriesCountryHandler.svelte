<script lang="ts">
  import { getContext, onMount, untrack } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { Country } from '../../../../lib/marker';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  interface Props {
    country: Country;
  }

  let { country }: Props = $props();

  const sourceId = 'natural-earth-countries';
  const sourceLayer = 'world';
  // Use random suffix to ensure unique ID, in case of duplicates.
  // The parent key ensures the country.code will never change for the lifetime of this component.
  const layerId = untrack(() => `highlight-country-${country.code}-${Math.random().toString(36).substring(2, 11)}`);

  function getCountryColor(style: string) {
    return style === 'secondary' ? '#8ad1e8' : '#b9a0ce';
  }

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Wait for parent to ensure source exists (handled by parent logic now, but double check doesn't hurt)
    if (!map.getSource(sourceId)) return;

    untrack(() => {
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          'source-layer': sourceLayer,
          filter: ['==', 'iso_a2_eh', country.code],
          paint: {
            'fill-color': getCountryColor(country.style),
            'fill-opacity': 0, // Start invisible
            'fill-color-transition': { duration: 250 },
            'fill-opacity-transition': { duration: 250 }
          }
        });

        // Trigger fade in
        requestAnimationFrame(() => {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'fill-opacity', 0.5);
          }
        });
      }
    });

    return () => {
      if (mapRoot.map && map.getLayer(layerId)) {
        // Fade out
        map.setPaintProperty(layerId, 'fill-opacity', 0);

        // Remove after transition
        setTimeout(() => {
          if (mapRoot.map && map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
        }, 300);
      }
    };
  });

  $effect(() => {
    // Need to track country.style to trigger updates
    const style = country.style;
    if (!mapRoot.map) return;
    const map = mapRoot.map;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'fill-color', getCountryColor(style));
    }
  });
</script>

<!-- No markup needed, just map logic -->
