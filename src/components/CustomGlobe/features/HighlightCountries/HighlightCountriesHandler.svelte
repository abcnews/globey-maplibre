<script lang="ts">
  /**
   * @file HighlightCountriesHandler.svelte
   *
   * ARCHITECTURE:
   * - This component (Parent) loads the natural-earth-countries.
   * - Child components (HighlightCountriesCountryHandler) each create a filtered Layer for one country.
   *
   * RATIONALE:
   * By giving each country its own Layer, we can independently animate them (fade in/out) as they are added/removed
   * from the Svelte list, while still sharing the same underlying data source.
   */

  import type { maplibregl } from '../../../mapLibre/index';
  import { getContext } from 'svelte';
  import naturalEarthStyle from '../../mapStyle/countriesNaturalEarth';
  import type { Country } from '../../../../lib/marker';
  import HighlightCountriesCountryHandler from './HighlightCountriesCountryHandler.svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const {
    highlightCountries = []
  }: {
    highlightCountries?: Country[];
  } = $props();

  const sourceId = 'natural-earth-countries';

  let sourceLoaded = $state(false);

  // Effect: Lifecycle (Source only)
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    const checkSource = () => {
      if (map.getSource(sourceId)) {
        sourceLoaded = true;
      } else {
        // Add source if it doesn't exist
        map.addSource(sourceId, {
          ...naturalEarthStyle.sources.composite,
          promoteId: 'iso_a2'
        } as any);
        // Check again in next tick or wait for 'styledata' event ideally,
        // but addSource is sync-ish for config, checking immediately after:
        if (map.getSource(sourceId)) {
          sourceLoaded = true;
        }
      }
    };

    checkSource();
  });
</script>

{#if sourceLoaded}
  {#each highlightCountries as country (country.code)}
    <HighlightCountriesCountryHandler {country} />
  {/each}
{/if}
