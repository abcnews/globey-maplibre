<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import naturalEarthStyle from '../mapStyle/countriesNaturalEarth';
  import type { Country } from '../../../lib/marker';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const {
    highlightCountries = []
  }: {
    highlightCountries?: Country[];
  } = $props();

  const sourceId = 'natural-earth-countries';
  const layerId = 'countries-highlight';

  let matchArgs = $derived(highlightCountries.flatMap(c => [c.code, c.style === 'secondary' ? '#8ad1e8' : '#b9a0ce']));

  let fillColorExpression = $derived([
    'match',
    ['get', 'iso_a2'],
    ...matchArgs,
    'rgba(0,0,0,0)' // Default color
  ]);

  // Effect 1: Lifecycle (depends only on map)
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Add source if it doesn't exist
    if (!map.getSource(sourceId)) {
      // @ts-ignore
      map.addSource(sourceId, naturalEarthStyle.sources.composite);
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        'source-layer': 'world',
        paint: {
          'fill-color': 'rgba(0,0,0,0)', // Start transparent
          'fill-opacity': 0.5,
          'fill-color-transition': { duration: 250 }
        }
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    };
  });

  // Effect 2: Update Style (depends on expression)
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'fill-color', fillColorExpression);
    }
  });
</script>
