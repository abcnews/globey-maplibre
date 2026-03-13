<script lang="ts">
  import { options } from '../store';
  import PropHighlightCountriesEditor from './PropHighlightCountriesEditor.svelte';
  import type { maplibregl } from '../../mapLibre/index';
  import type { Country } from '../../../lib/marker';

  const {
    map,
    highlightCountries = [],
    onchange
  }: {
    map: maplibregl.Map;
    highlightCountries?: Country[];
    onchange?: (countries: Country[]) => void;
  } = $props();
</script>

{#if $options?.base === 'countries'}
  <fieldset>
    <legend>Countries</legend>
    <PropHighlightCountriesEditor {map} {highlightCountries} {onchange} />
  </fieldset>

  <small>This feature is only available when the Map Base is set to <strong>Countries</strong>.</small>
{/if}
