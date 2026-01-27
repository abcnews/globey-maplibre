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

  let primaryCountries = $derived(highlightCountries.filter(c => c.style === 'primary').map(c => c.code));
  let secondaryCountries = $derived(highlightCountries.filter(c => c.style === 'secondary').map(c => c.code));

  $effect(() => {
    if (!mapRoot.map) {
      return;
    }

    const map = mapRoot.map;
    const sourceId = 'natural-earth-countries';
    const primaryLayerId = 'countries-highlight-primary';
    const secondaryLayerId = 'countries-highlight-secondary';

    // Add source if it doesn't exist
    if (!map.getSource(sourceId)) {
      // @ts-ignore
      map.addSource(sourceId, naturalEarthStyle.sources.composite);
    }

    // Helper to add/update layer
    const updateLayer = (id: string, color: string, codes: string[]) => {
      if (!map.getLayer(id)) {
        map.addLayer({
          id: id,
          type: 'fill',
          source: sourceId,
          'source-layer': 'world',
          paint: {
            'fill-color': color,
            'fill-opacity': 0.5
          },
          filter: ['in', 'iso_a2', ...codes]
        });
      } else {
        map.setFilter(id, ['in', 'iso_a2', ...codes]);
      }
    };

    updateLayer(primaryLayerId, '#b9a0ce', primaryCountries); // Purple
    updateLayer(secondaryLayerId, '#8ad1e8', secondaryCountries); // Blue

    return () => {
      if (map.getLayer(primaryLayerId)) map.removeLayer(primaryLayerId);
      if (map.getLayer(secondaryLayerId)) map.removeLayer(secondaryLayerId);
    };
  });
</script>
