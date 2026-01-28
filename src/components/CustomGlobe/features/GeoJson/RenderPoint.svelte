<script lang="ts">
  import { getContext } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import PointMarker from './PointMarker.svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  let features = $derived(data?.features || []);
</script>

{#if mapRoot.map}
  {#each features as feature (feature.id || JSON.stringify(feature.geometry))}
    <PointMarker {feature} {config} map={mapRoot.map} />
  {/each}
{/if}
